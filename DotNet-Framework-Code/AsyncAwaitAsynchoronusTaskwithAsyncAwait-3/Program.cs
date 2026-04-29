namespace AsyncAwaitAsynchoronusTaskwithAsyncAwait_3
{
    public class Program
    {
        
        static void Main(string[] args)
        {
            Method1_2();

            int k = Method3();
            Console.WriteLine(k);
            Console.Read();
        }

        //Asynchronous with Task async/await

        static async void Method1_2()
        {
            Console.WriteLine("Test");

            var i = await Task.Run(() =>
            {
                return Method1();
            });

            Console.WriteLine(i);

            int j = Method2(i);
            Console.WriteLine(j);
        }
        //Output: Test 30  10  200

        static int Method1()
        {
            Thread.Sleep(500);
            return 10;
        }

        static int Method2(int i)
        {
            return 20 * i;
        }

        static int Method3()
        {
            return 30;
        }
        
    }
}