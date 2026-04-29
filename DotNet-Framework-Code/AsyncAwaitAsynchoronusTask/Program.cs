namespace AsyncAwaitAsynchoronusTask
{
    internal class Program
    {
        //Asynchronous Programming - Task
        public static int Method1()
        {
            Thread.Sleep(500);
            return 10;
        }
        public static int Method2()
        {
            return 20;
        }
        public static int Method3()
        {
            return 30;
        }

        public static void Main(string[] args)
        {
            Task task1 = Task.Run(() => {
                Console.WriteLine(Method1());
            });

            Task task2 = Task.Run(() => {
                Console.WriteLine(Method2());
            });

            Task task3 = Task.Run(() => {
                Console.WriteLine(Method3());
            });
            Console.Read();
        }
        //Output: 20 30 10

    }

}