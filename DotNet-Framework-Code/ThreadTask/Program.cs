namespace ThreadTask
{
    internal class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello, World!");
        }
    }
    public class ExampleThread
    {
        public void DoWork()
        {
            Thread thread = new Thread(new 
                ThreadStart(LongRunningMethod));
            thread.Start();
        }

        private void LongRunningMethod()
        {
            // simulate a long-running operation
            Thread.Sleep(5000);
            // continue with the rest of the method
        }
    }

    public class ExampleTask
    {
        public async Task DoWorkAsync()
        {
            await Task.Delay(5000);
            // continue with the rest of the method
        }
    }
}